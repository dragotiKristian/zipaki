#!/usr/bin/env node
/* eslint-disable max-statements */
/* eslint-disable node/no-missing-import */
/* eslint-disable node/file-extension-in-import */
/* eslint-disable node/no-unsupported-features/es-syntax */
// eslint-disable-next-line node/shebang
import * as cdk from 'aws-cdk-lib';
import { IDistribution } from 'aws-cdk-lib/aws-cloudfront';
import {
  ISecurityGroup,
  IVpc,
  SecurityGroup,
  SubnetType,
  Vpc,
} from 'aws-cdk-lib/aws-ec2';
import {
  Cluster,
  Secret as EcsSecret,
  FargatePlatformVersion,
} from 'aws-cdk-lib/aws-ecs';
import { CfnMountTarget, FileSystem } from 'aws-cdk-lib/aws-efs';
import { Effect, PolicyStatement } from 'aws-cdk-lib/aws-iam';
import { Key } from 'aws-cdk-lib/aws-kms';
import {
  BlockPublicAccess,
  Bucket,
  HttpMethods,
  IBucket,
} from 'aws-cdk-lib/aws-s3';
import { CfnSecret, ISecret, Secret } from 'aws-cdk-lib/aws-secretsmanager';
import {
  Choice,
  Condition,
  IntegrationPattern,
  JsonPath,
  Pass,
  Map as SfnMap,
  StateMachine,
} from 'aws-cdk-lib/aws-stepfunctions';
import {
  EcsFargateLaunchTarget,
  EcsRunTask,
} from 'aws-cdk-lib/aws-stepfunctions-tasks';
import { Construct } from 'constructs';
import 'source-map-support/register';
import efsPlugin from '../modules/efs_plugin';
import { TaskStack } from './task';

export class StepFunctionStack extends cdk.Stack {
    /**
   * Name of the application
   */
    readonly applicationName: string;
    /**
   * Name of the environment
   */
    readonly environmentName: string;
    /**
   * Environment VPC
   */
    readonly vpc: IVpc;
    onixStack: TaskStack;
    efsPullStack: TaskStack;
    ePubStack: TaskStack;
    readonly repos: string[];
    readonly stackProps: cdk.StackProps;
    readonly bucket: IBucket;
    readonly imageBucket: IBucket;
    readonly efs: {
    id: string;
    securityGroup: ISecurityGroup;
  };
    readonly keyArn: string;
    readonly sharedSecret: ISecret;
    readonly onixTag: string;
    readonly efsPullTag: string;
    readonly epubTag: string;
    readonly cloudfrontDistribution: IDistribution;

    constructor(
        scope: Construct,
        id: string,
        {
            applicationName,
            environmentName,
            repos,
            efs,
            vpcId,
            cluster: propsCluster,
            keyArn,
            imageBucket,
            cloudfrontEndpoint,
            ...otherProps
        }: {
      applicationName: string;
      environmentName: string;
      repos: string[];
      efs: {
        id: string;
        securityGroupId: string;
      };
      vpcId: string;
      cluster: {
        name: string;
        securityGroupIds: string[];
      };
      keyArn: string;
      imageBucket: string;
      cloudfrontEndpoint: string;
    } & cdk.StackProps
    ) {
        super(scope, id, otherProps);
        const onixTag = new cdk.CfnParameter(this, 'onixTag', {
            description: 'ECR Repo Tag for the Onix Service',
        });

        const efsPullTag = new cdk.CfnParameter(this, 'efsPullTag', {
            description: 'ECR Repo Tag for the EfsPull Service',
        });

        const epubTag = new cdk.CfnParameter(this, 'epubTag', {
            description: 'ECR Repo Tag for the EPub Service',
        });

        this.onixTag = onixTag.valueAsString;
        this.efsPullTag = efsPullTag.valueAsString;
        this.epubTag = epubTag.valueAsString;

        this.vpc = Vpc.fromLookup(this, 'Vpc', { vpcId });
        this.repos = repos;
        this.applicationName = applicationName;
        this.environmentName = environmentName;
        this.stackProps = otherProps;
        this.efs = {
            id: efs.id,
            securityGroup: SecurityGroup.fromSecurityGroupId(
                this,
                'EfsSecurityGroup',
                efs.securityGroupId
            ),
        };
        this.bucket = new Bucket(this, 'Bucket', {
            bucketName: `${this.applicationName}-${this.environmentName}-ftp-jobs`,
            removalPolicy: cdk.RemovalPolicy.DESTROY,
            cors: [
                {
                    allowedMethods: [HttpMethods.POST, HttpMethods.GET, HttpMethods.PUT],
                    allowedHeaders: ['*'],
                    allowedOrigins: ['*'],
                    exposedHeaders: [],
                    maxAge: 0,
                },
            ],
            publicReadAccess: true,
            blockPublicAccess: BlockPublicAccess.BLOCK_ACLS,
        });
        this.imageBucket = Bucket.fromBucketName(this, 'ImageBucket', imageBucket);
        this.keyArn = keyArn;

        const basePropsCluster = {
            name: propsCluster.name,
            securityGroups: propsCluster.securityGroupIds.map((e, idx) =>
                SecurityGroup.fromSecurityGroupId(this, `SecurityGroup${idx}`, e)
            ),
        };

        const cluster = Cluster.fromClusterAttributes(this, 'EcsCluster', {
            vpc: this.vpc,
            clusterName: propsCluster.name,
            securityGroups: basePropsCluster.securityGroups,
        });

        const secret = new CfnSecret(this, `SecretFtpJobs`, {
            name: `secrets/${this.applicationName}/${this.environmentName}/ftp-jobs`,
            kmsKeyId: Key.fromKeyArn(this, 'SecretKey', this.keyArn).keyId,
        });

        this.sharedSecret = Secret.fromSecretNameV2(
            this,
            `FullSecretFtpJobs`,
      secret.name!
        );

        this.buildEfsPullStack();
        this.buildOnixStack();
        this.buildEPubStack();

        const epubMap = new SfnMap(this, 'EPubMap');
        const epubTaskDefinition = {
            integrationPattern: IntegrationPattern.WAIT_FOR_TASK_TOKEN,
            cluster,
            launchTarget: new EcsFargateLaunchTarget({
                platformVersion: FargatePlatformVersion.LATEST,
            }),
            securityGroups: basePropsCluster.securityGroups,
            taskDefinition: this.ePubStack.taskDefinition,
            assignPublicIp: true,
            containerOverrides: [
                {
                    containerDefinition: this.onixStack.taskDefinition.defaultContainer!,
                    environment: [
                        {
                            name: 'EPUB',
                            value: JsonPath.jsonToString(JsonPath.stringAt('$')),
                        },
                        {
                            name: 'bucketImageUpload',
                            value: this.imageBucket.bucketName,
                        },
                        {
                            name: 'bucketApplicationUpload',
                            value: this.imageBucket.bucketName,
                        },
                        {
                            name: 's3_endpoint',
                            value: `https://s3.${otherProps.env?.region}.amazonaws.com`,
                        },
                        {
                            name: 'TASK_TOKEN',
                            value: JsonPath.taskToken,
                        },
                        {
                            name: 'cloudfront_endpoint',
                            value: cloudfrontEndpoint,
                        },
                    ],
                },
            ],
        };
        const epubTask = new EcsRunTask(this, 'EpubParserTask', epubTaskDefinition);
        epubMap.iterator(epubTask);

        const onixTaskDefinition = (exposeEpub: boolean) => ({
            integrationPattern: IntegrationPattern.WAIT_FOR_TASK_TOKEN,
            cluster,
            launchTarget: new EcsFargateLaunchTarget({
                platformVersion: FargatePlatformVersion.LATEST,
            }),
            securityGroups: basePropsCluster.securityGroups,
            taskDefinition: this.onixStack.taskDefinition,
            assignPublicIp: true,
            containerOverrides: [
                {
                    containerDefinition:
              this.onixStack.taskDefinition.defaultContainer!,
                    environment: [
                        {
                            name: 'ONIX',
                            value: JsonPath.jsonToString(JsonPath.stringAt('$.onix')),
                        },
                        ...(exposeEpub
                            ? [
                                {
                                    name: 'EPUB',
                                    value: JsonPath.jsonToString(JsonPath.stringAt('$.epub')),
                                },
                            ]
                            : []),
                        {
                            name: 'TASK_TOKEN',
                            value: JsonPath.taskToken,
                        },
                    ],
                },
            ],
        });

        const efsPullTask = new EcsRunTask(this, 'EfsPullTask', {
            integrationPattern: IntegrationPattern.WAIT_FOR_TASK_TOKEN,
            cluster,
            launchTarget: new EcsFargateLaunchTarget({
                platformVersion: FargatePlatformVersion.LATEST,
            }),
            securityGroups: basePropsCluster.securityGroups,
            taskDefinition: this.efsPullStack.taskDefinition,
            assignPublicIp: true,
            containerOverrides: [
                {
                    containerDefinition:
            this.efsPullStack.taskDefinition.defaultContainer!,
                    environment: [
                        {
                            name: 'TASK_TOKEN',
                            value: JsonPath.taskToken,
                        },
                        {
                            name: 'BUCKET_NAME',
                            value: this.bucket.bucketName,
                        },
                    ],
                },
            ],
        }).next(
            new Pass(this, 'OnixPass', {
                outputPath: '$',
                parameters: {
                    EpubLength: JsonPath.arrayLength(JsonPath.listAt('$.epub')),
                },
                resultPath: '$.EpubLength'
            }).next(
                new Choice(this, 'OnixChoice', {})
                    .when(
                        Condition.numberGreaterThan('$.EpubLength.EpubLength', 50),
                        new SfnMap(this, 'PartialOnixMap', {
                            itemsPath: JsonPath.stringAt('$.onix'),
                            parameters: {
                                onix: JsonPath.stringAt('$$.Map.Item.Value'),
                            },
                        }).iterator(
                            new EcsRunTask(this, 'PartialOnixTask', onixTaskDefinition(false))
                        )
                    )
                    .otherwise(
                        new SfnMap(this, 'OnixParserMap', {
                            itemsPath: JsonPath.stringAt('$.onix'),
                            parameters: {
                                onix: JsonPath.stringAt('$$.Map.Item.Value'),
                                epub: JsonPath.stringAt('$.epub'),
                            },
                        }).iterator(
                            new EcsRunTask(this, 'OnixParserTask', onixTaskDefinition(true)).next(epubMap)
                        )
                    )
            )
        );

        const reparseChoice = new Choice(this, 'ReparseChoice', {});
        reparseChoice
            .when(
                Condition.isPresent('$.REPARSE_EPUB'),
                new SfnMap(this, 'ReparseEpubMap', {
                    inputPath: '$.REPARSE_EPUB',
                }).iterator(new EcsRunTask(this, 'ReparseEpubTask', epubTaskDefinition))
            )
            .otherwise(efsPullTask);

        const sfn = new StateMachine(this, 'StateMachine', {
            definition: reparseChoice,
            stateMachineName: `${this.applicationName}-${this.environmentName}-ftp-jobs`,
        });

        this.efsPullStack.taskRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['states:SendTaskSuccess', 'states:SendTaskFailure'],
                resources: ['*'],
            })
        );

        this.onixStack.taskRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['states:SendTaskSuccess', 'states:SendTaskFailure'],
                resources: ['*'],
            })
        );

        this.ePubStack.taskRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['states:SendTaskSuccess', 'states:SendTaskFailure'],
                resources: ['*'],
            })
        );
    }

    buildOnixStack() {
        this.onixStack = new TaskStack(this, 'Onix', {
            serviceName: 'onix',
            repositoryName: this.repos[0],
            applicationName: this.applicationName,
            environmentName: this.environmentName,
            imageTag: this.onixTag,
            keyArn: this.keyArn,
            ...this.stackProps,
        });

        this.onixStack.taskDefinition.defaultContainer?.addEnvironment(
            'appName',
            this.onixStack.serviceName
        );
        this.onixStack.taskDefinition.defaultContainer?.addEnvironment(
            'logs',
            'true'
        );

        this.addSharedSecret(this.onixStack);
    }

    buildEfsPullStack() {
        this.efsPullStack = new TaskStack(this, 'EfsPull', {
            serviceName: 'efs-pull',
            repositoryName: this.repos[1],
            applicationName: this.applicationName,
            environmentName: this.environmentName,
            imageTag: this.efsPullTag,
            keyArn: this.keyArn,
            ...this.stackProps,
        });

        this.efsPullStack.addPlugin(efsPlugin, {
            accessPoint: {
                path: '/',
            },
            efs: this.efs,
            path: '/efs',
            subnets: this.vpc.selectSubnets({
                subnetType: SubnetType.PUBLIC,
            }).subnets,
        });

        const efs = FileSystem.fromFileSystemAttributes(this, 'EFS', {
            fileSystemId: this.efs.id,
            securityGroup: this.efs.securityGroup,
        });

        if (this.environmentName === 'prod') {
            this.vpc
                .selectSubnets({ subnetType: SubnetType.PUBLIC })
                .subnets.filter((subnet) => subnet.availabilityZone !== 'eu-west-1a')
                .map((subnet) => subnet.subnetId)
                .forEach(
                    (subnetId, idx) =>
                        new CfnMountTarget(this, `MT${idx}`, {
                            fileSystemId: efs.fileSystemId,
                            subnetId,
                            securityGroups: [this.efs.securityGroup.securityGroupId],
                        })
                );
        }

        this.efsPullStack.taskRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['s3:PutObject', 's3:PutObjectAcl'],
                resources: [this.bucket.arnForObjects('*')],
            })
        );

        this.addSharedSecret(this.efsPullStack);
    }

    buildEPubStack() {
        this.ePubStack = new TaskStack(this, 'EPub', {
            serviceName: 'epub',
            repositoryName: this.repos[2],
            applicationName: this.applicationName,
            environmentName: this.environmentName,
            imageTag: this.epubTag,
            keyArn: this.keyArn,
            memoryMiB: '2048',
            ...this.stackProps,
        });

        this.ePubStack.taskDefinition.defaultContainer?.addEnvironment(
            'appName',
            this.ePubStack.serviceName
        );
        this.ePubStack.taskDefinition.defaultContainer?.addEnvironment(
            'logs',
            'true'
        );

        this.ePubStack.taskRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['s3:PutObject', 's3:PutObjectAcl', 's3:GetObjectVersion'],
                resources: [this.imageBucket.arnForObjects('*')],
            })
        );

        this.addSharedSecret(this.ePubStack);
    }

    addSharedSecret(stack: TaskStack) {
        stack.executionRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['secretsmanager:GetSecretValue'],
                resources: [`${this.sharedSecret.secretArn}-??????`],
            })
        );

        stack.executionRole.addToPolicy(
            new PolicyStatement({
                effect: Effect.ALLOW,
                actions: ['kms:Decrypt'],
                resources: [this.keyArn],
            })
        );

        stack.taskDefinition.defaultContainer?.addSecret(
            'mongodbURI',
            EcsSecret.fromSecretsManager(this.sharedSecret, 'MONGODB_URI')
        );
    }

    addPlugin<TProps>(
        plugin: (this: this, props: TProps) => this,
        props: TProps
    ) {
        plugin.bind(this, props)();
        return this;
    }
}
