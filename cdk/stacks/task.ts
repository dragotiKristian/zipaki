#!/usr/bin/env node
/* eslint-disable node/no-missing-import */
/* eslint-disable node/file-extension-in-import */
/* eslint-disable node/no-unsupported-features/es-syntax */
// eslint-disable-next-line node/shebang
import * as cdk from "aws-cdk-lib";
import { IRepository, Repository } from "aws-cdk-lib/aws-ecr";
import { ContainerImage, ICluster, TaskDefinition } from "aws-cdk-lib/aws-ecs";
import { Role } from "aws-cdk-lib/aws-iam";
import { IKey, Key } from "aws-cdk-lib/aws-kms";
import { ILogGroup } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";
import "source-map-support/register";
import { ExecutionRole, TaskRole } from "../modules/iam";
import { EcsTaskDefinition } from "../modules/task_definition";

export type Plugin<TStack extends TaskStack, TProps> = (this: TStack, props: TProps) => any;
export type PluginProps<TPlugin extends Plugin<any, any>> = TPlugin extends Plugin<any, infer TProps> ? TProps : never;

export class TaskStack extends cdk.NestedStack {
  /**
   * Name of the application
   */
  readonly applicationName: string;
  /**
   * Name of the environment
   */
  readonly environmentName: string;
  /**
   * Name of the service
   */
  readonly serviceName: string;
  /**
   * Task Execution Role
   */
  readonly executionRole: Role;
  /**
   * Task Role
   */
  readonly taskRole: Role;
  /**
   * Task Definition
   */
  readonly taskDefinition: TaskDefinition;
  /**
   * Environment KMS Key
   */
  readonly key: IKey;
  /**
   * ECS Cluster
   */
  readonly ecsCluster: ICluster;
  /**
   * Plugin resources
   */
  readonly pluginResources: {
    pluginName: string;
    resources: Record<string, unknown>;
  }[];
  /**
   * Cloudwatch Log Group
   */
  readonly cloudwatchLogGroup: ILogGroup;
  /**
   * ECR Repository
   */
  readonly repo: IRepository;

  constructor(
    scope: Construct,
    id: string,
    {
      serviceName,
      repositoryName,
      imageTag,
      applicationName,
      environmentName,
      keyArn,
      cpu = '256',
      memoryMiB = '512',
      ...otherProps
    }: {
      serviceName: string;
      repositoryName: string;
      imageTag: string;
      applicationName: string;
      environmentName: string;
      keyArn: string;
      cpu?: string;
      memoryMiB?: string;
    } & cdk.StackProps
  ) {
    super(scope, id, otherProps);
    this.repo = Repository.fromRepositoryName(
      this,
      "Repository",
      repositoryName
    );

    this.applicationName = applicationName;
    this.environmentName = environmentName;
    this.serviceName = serviceName;
    this.pluginResources = [];
    this.executionRole = new ExecutionRole(this, "ExecutionRole", {});

    this.taskRole = new TaskRole(this, "TaskRole", { allowedRoleArns: ["*"] });

    const { taskDefinition, cloudwatchLogGroup } = new EcsTaskDefinition(
      this,
      "Task",
      {
        cloudwatchLogGroupName: `${applicationName}-${environmentName}-${serviceName}`,
        executionRole: this.executionRole,
        taskRole: this.taskRole,
        containers: [
          {
            image: ContainerImage.fromEcrRepository(this.repo, imageTag)
          },
        ],
        cpu,
        memoryMiB
      }
    );

    this.taskDefinition = taskDefinition;
    this.cloudwatchLogGroup = cloudwatchLogGroup;
    this.key = Key.fromKeyArn(this, 'Key', keyArn);
  }

  buildDescription(additionalData: string) {
    return `${this.applicationName} ${this.environmentName} ${this.serviceName} ${additionalData}`;
  }

  addPlugin<TPlugin extends Plugin<this, any>>(plugin: TPlugin, props: PluginProps<TPlugin>) {
    plugin.bind(this, props)();
    return this;
  }

  addTestPlugin<TProps>(plugin: Plugin<this, TProps>) {
    return (props: TProps) => plugin.bind(this, props)();
  }
}
