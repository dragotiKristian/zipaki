#!/usr/bin/env node
/* eslint-disable node/no-missing-import */
/* eslint-disable node/file-extension-in-import */
/* eslint-disable node/no-unsupported-features/es-syntax */
// eslint-disable-next-line node/shebang
import * as cdk from "aws-cdk-lib";
import { Key } from "aws-cdk-lib/aws-kms";
import { ISecret, Secret } from "aws-cdk-lib/aws-secretsmanager";
import { Construct } from "constructs";
import "source-map-support/register";

export class SecretsStack extends cdk.Stack {
  readonly secrets: ISecret[];

  constructor(
    scope: Construct,
    id: string,
    {
      environmentName,
      services,
      kmsKeyArn,
      applicationName,
      ...otherProps
    }: {
      environmentName: string;
      services: string[];
      kmsKeyArn: string;
      applicationName: string;
    } & cdk.StackProps
  ) {
    super(scope, id, otherProps);

    const key = Key.fromKeyArn(this, 'KmsKey', kmsKeyArn);

    cdk.Tags.of(this).add('copilot-application', applicationName);
    cdk.Tags.of(this).add('copilot-environment', environmentName);

    this.secrets = services.map(service => new Secret(this, `${service}Secret`, {
        description: `Secrets for ${environmentName} environment for ${service.toUpperCase()} service`,
        encryptionKey: key,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        secretName: `secrets/${environmentName}/${service}`
    }));
  }
}
