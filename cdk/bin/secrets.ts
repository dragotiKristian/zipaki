#!/usr/bin/env node
/* eslint-disable node/no-missing-import */
/* eslint-disable node/file-extension-in-import */
/* eslint-disable node/no-unsupported-features/es-syntax */
// eslint-disable-next-line node/shebang
import * as cdk from 'aws-cdk-lib';
import 'source-map-support/register';
import { SecretsStack } from '../stacks/secrets';

const app = new cdk.App();
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION };
new SecretsStack(app, 'zipaki-prod-secrets', {
    env,
    environmentName: 'prod',
    applicationName: 'zipaki-be',
    services: ['shared', 'panic-mode', 'cms', 'be'],
    kmsKeyArn: 'arn:aws:kms:eu-west-1:076872044204:key/e86a5f6a-5452-4732-895d-7e88c62a6b94'
})