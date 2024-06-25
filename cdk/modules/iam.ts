import {
  Effect,
  PolicyStatement,
  Role,
  RoleProps,
  ServicePrincipal,
} from "aws-cdk-lib/aws-iam";
import { Construct } from "constructs";

export interface ExecutionRoleProps extends RoleProps {}

export class ExecutionRole extends Role {
  constructor(
    scope: Construct,
    id: string,
    props: Omit<ExecutionRoleProps, 'assumedBy'>
  ) {
    super(scope, id, {
      ...props,
      assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com"),
    });

    this.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "ecr:GetAuthorizationToken",
          "ecr:BatchCheckLayerAvailability",
          "ecr:GetDownloadUrlForLayer",
          "ecr:BatchGetImage",
        ],
        resources: ["*"],
      })
    );
  }
}

export interface TaskRoleProps extends RoleProps {
  allowedRoleArns: string[];
}

export class TaskRole extends Role {
  constructor(
    scope: Construct,
    id: string,
    { allowedRoleArns, ...props }: Omit<TaskRoleProps, 'assumedBy'>
  ) {
    super(scope, id, {
      ...props,
      assumedBy: new ServicePrincipal("ecs-tasks.amazonaws.com")
    });

    this.addToPolicy(
      new PolicyStatement({
        effect: Effect.DENY,
        actions: ["iam:*"],
        resources: ["*"],
      })
    );

    this.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: ["sts:AssumeRole"],
        resources: allowedRoleArns,
      })
    );

    this.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "ssmmessages:CreateControlChannel",
          "ssmmessages:OpenControlChannel",
          "ssmmessages:CreateDataChannel",
          "ssmmessages:OpenDataChannel",
        ],
        resources: ["*"],
      })
    );

    this.addToPolicy(
      new PolicyStatement({
        effect: Effect.ALLOW,
        actions: [
          "logs:CreateLogStream",
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:PutLogEvents",
        ],
        resources: ["*"],
      })
    );
  }
}
