import { RemovalPolicy } from "aws-cdk-lib";
import {
  Compatibility,
  ContainerDefinitionProps,
  LogDriver,
  TaskDefinition,
  TaskDefinitionProps,
} from "aws-cdk-lib/aws-ecs";
import { Effect, Policy, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { LogGroup, RetentionDays } from "aws-cdk-lib/aws-logs";
import { Construct } from "constructs";

export interface EcsTaskDefinitionProps extends Omit<TaskDefinitionProps, 'compatibility'> {
    containers: Omit<ContainerDefinitionProps, 'taskDefinition' | 'logging'>[];
    cloudwatchLogGroupName: string;
}
export class EcsTaskDefinition extends Construct {
  readonly taskDefinition: TaskDefinition;
  readonly cloudwatchLogGroup: LogGroup;
  constructor(
    scope: Construct,
    id: string,
    {
      containers,
      cloudwatchLogGroupName,
      ...props
    }: EcsTaskDefinitionProps
  ) {
    super(scope, id);
    this.taskDefinition = new TaskDefinition(this, "TaskDefinition", { ...props, compatibility: Compatibility.FARGATE });
    this.cloudwatchLogGroup = new LogGroup(this, "LogGroup", {
      retention: RetentionDays.ONE_MONTH,
      logGroupName: cloudwatchLogGroupName,
      removalPolicy: RemovalPolicy.DESTROY
    });
    containers.map((container, idx) => {
      this.taskDefinition.addContainer(
        container.containerName ?? `Container${idx}`,
        {
          ...container,
          logging: LogDriver.awsLogs({
            streamPrefix: 'ecs',
            logGroup: this.cloudwatchLogGroup,
          })
        }
      );
    });
    props.executionRole?.attachInlinePolicy(
      new Policy(this, "LogPolicy", {
        statements: [
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: ["logs:CreateLogGroup"],
            resources: [`${this.cloudwatchLogGroup.logGroupArn}/*`],
          }),
          new PolicyStatement({
            effect: Effect.ALLOW,
            actions: [
              "logs:CreateLogStream",
              "logs:PutLogEvents",
              "logs:CreateLogGroup",
            ],
            resources: [`${this.cloudwatchLogGroup.logGroupArn}:log-stream:*`],
          }),
        ],
      })
    );
  }
}
