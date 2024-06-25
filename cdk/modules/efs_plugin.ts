import { RemovalPolicy } from "aws-cdk-lib";
import { ISecurityGroup, ISubnet, IVpc } from "aws-cdk-lib/aws-ec2";
import { AccessPoint, AccessPointProps, FileSystem } from "aws-cdk-lib/aws-efs";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { TaskStack } from "../stacks/task";

function efsPlugin<TStack extends TaskStack>(
  this: TStack,
  {
    accessPoint,
    path,
    efs: efsProps,
  }: {
    accessPoint: Omit<AccessPointProps, "fileSystem">;
    path: string;
    subnets: ISubnet[];
    efs:
      | {
          id: string;
          securityGroup: ISecurityGroup;
        }
      | {
          vpc: IVpc;
          name: string;
          securityGroup: ISecurityGroup;
        };
  }
) {
  const efs =
    "id" in efsProps
      ? FileSystem.fromFileSystemAttributes(this, "Efs", {
          fileSystemId: efsProps.id,
          securityGroup: efsProps.securityGroup,
        })
      : new FileSystem(this, "Efs", {
          vpc: efsProps.vpc,
          fileSystemName: efsProps.name,
          securityGroup: efsProps.securityGroup,
          removalPolicy: RemovalPolicy.DESTROY,
        });
  const efsAccessPoint = new AccessPoint(this, "AccessPoint", {
    fileSystem: efs,
    ...accessPoint,
  });
  this.taskDefinition.addVolume({
    name: "service-storage",
    efsVolumeConfiguration: {
      fileSystemId: efs.fileSystemId,
      authorizationConfig: {
        accessPointId: efsAccessPoint.accessPointId,
        iam: "ENABLED",
      },
      transitEncryption: "ENABLED",
      transitEncryptionPort: 2999,
    },
  });
  this.taskRole.addToPolicy(
    new PolicyStatement({
      effect: Effect.ALLOW,
      resources: [efs.fileSystemArn],
      actions: [
        "elasticfilesystem:ClientMount",
        "elasticfilesystem:ClientWrite",
      ],
      conditions: {
        StringEquals: {
          "elasticfilesystem:AccessPointArn": efsAccessPoint.accessPointArn,
        },
      },
    })
  );
  this.taskDefinition.defaultContainer?.addMountPoints({
    sourceVolume: "service-storage",
    containerPath: path,
    readOnly: false,
  });

  this.pluginResources.push({
    pluginName: "efsPlugin",
    resources: {
      efs: efs,
      accessPoint: efsAccessPoint,
    },
  });

  return this;
}

export default efsPlugin;
