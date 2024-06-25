#!/usr/bin/env node
/* eslint-disable node/no-missing-import */
/* eslint-disable node/file-extension-in-import */
/* eslint-disable node/no-unsupported-features/es-syntax */
// eslint-disable-next-line node/shebang
import * as cdk from "aws-cdk-lib";
import { IQueue, Queue } from "aws-cdk-lib/aws-sqs";
import { Construct } from "constructs";
import "source-map-support/register";

export class QueueStack extends cdk.Stack {
  readonly queues: IQueue[];

  constructor(
    scope: Construct,
    id: string,
    {
      environmentName,
      prefixes,
      ...otherProps
    }: {
      environmentName: string;
      prefixes: string[];
    } & cdk.StackProps
  ) {
    super(scope, id, otherProps);

    this.queues = prefixes.map(
      (prefix) =>
        new Queue(this, `${prefix}Queue`, {
          queueName: `${prefix}_${environmentName}`,
        })
    );
  }
}
