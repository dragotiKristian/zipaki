#!/usr/bin/env node
/* eslint-disable node/no-missing-import */
/* eslint-disable node/file-extension-in-import */
/* eslint-disable node/no-unsupported-features/es-syntax */
// eslint-disable-next-line node/shebang
import * as cdk from 'aws-cdk-lib';
import 'source-map-support/register';
import { QueueStack } from '../stacks/sqs';

const app = new cdk.App();
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION };
new QueueStack(app, 'zipaki-prod-queues', {
    env,
    environmentName: 'prod',
    prefixes: ['be_mail','cms_mail','panic_mode']
})