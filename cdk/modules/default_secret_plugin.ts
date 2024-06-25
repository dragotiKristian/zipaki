import { Secret as EcsSecret } from "aws-cdk-lib/aws-ecs";
import { Effect, PolicyStatement } from "aws-cdk-lib/aws-iam";
import { CfnSecret, Secret } from "aws-cdk-lib/aws-secretsmanager";
import { TaskStack } from "../stacks/task";

function defaultSecretPlugin<TStack extends TaskStack>(
  this: TStack,
  { taskDefinitionSecretName }: { taskDefinitionSecretName: string }
) {
  const secret = new CfnSecret(this, 'DefaultSecret', {
    name: `secrets/${this.applicationName}/${this.environmentName}/${this.serviceName}`,
    kmsKeyId: this.key.keyId,
    description: this.buildDescription("Default Secret")
  })

  const fullSecret = Secret.fromSecretNameV2(this, 'FullSecret', secret.name!);

  this.taskDefinition.defaultContainer?.addSecret(
    taskDefinitionSecretName,
    EcsSecret.fromSecretsManager(fullSecret)
  );

  this.executionRole.addToPolicy(new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['secretsmanager:GetSecretValue'],
    resources: [`${fullSecret.secretArn}-??????`]
  }))

  this.executionRole.addToPolicy(new PolicyStatement({
    effect: Effect.ALLOW,
    actions: ['kms:Decrypt'],
    resources: [this.key.keyArn]
  }))


  return this;
}

export default defaultSecretPlugin;
