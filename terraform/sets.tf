# pipeline sets

locals {
  git_branch = "${module.config.default_environment_branch}"
}

module "codebuild" {
  source                  = "../../aws-terraform-modules/modules/codebuild-v2"
  project_name            = "${module.label.id_branch}"
  environment_name        = "${module.label.environment}"
  region                  = "${module.config.region}"
  domain                  = "${module.label.domain}"
  environment_domain      = "${module.vpc-label.environment_domain}"
  codebuild_docker_image  = "${module.config.aws_account_id}.dkr.ecr.eu-west-1.amazonaws.com/aucorp/aws-codebuild-nodejs14-image:latest"
  git_branch              = "${module.git.git_branch}"
  iam_role_name           = "${module.vpc-label.codebuild_role_name}"
  terraform_resource_name = "${module.label.id_invoker}"

  tags = "${module.label.tags}"
}

module "codepipeline" {
  source      = "../../aws-terraform-modules/modules/sets/pipelines/source-build-invoker-beanstalk-v2"
  aws_profile = "${local.aws_profile}"
  region      = "${module.config.region}"
  environment = "${module.config.environment_name}"
  domain      = "${local.domain}"

  name          = "${local.name}"
  git_repo      = "${local.git_repo}"
  git_branch    = "${local.git_branch}"
  token_payload = "${module.config.token_payload}"

  codebuild_project_name     = "${module.codebuild.project_name}"
  beanstalk_application_name = "${module.beanstalk-web-app-internal.name}"
}

output "pretty_pipeline" {
  value = "${module.codepipeline.pretty}"
}
