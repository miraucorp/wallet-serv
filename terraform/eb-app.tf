module "data-private-cidrs" {
  source             = "../../aws-terraform-modules/modules/data/vpc/cidr-list"
  vpc_tier           = "private"
  environment_domain = "${module.vpc-label.environment_domain}"
}

module "data-dmz-cidrs" {
  source             = "../../aws-terraform-modules/modules/data/vpc/cidr-list"
  vpc_tier           = "dmz"
  environment_domain = "${module.vpc-label.environment_domain}"
}

module "beanstalk-web-app-internal" {
  source             = "../../aws-terraform-modules/modules/beanstalk-al2-web-internal-application"
  app_name           = "${module.label.id}"
  domain             = "${module.label.domain}"
  region             = "${module.config.region}"
  environment        = "${module.label.environment}"
  environment_domain = "${module.vpc-label.environment_domain}"
  original_name      = "${module.label.id_original}"
  dns_name           = "${module.label.name}"

  solution_stack_name = "64bit Amazon Linux 2 v5.4.10 running Node.js 14"

  access_dmz_cidrs_enabled        = "true"
  access_private_cidrs_enabled    = "true"
  access_additional_cidrs_enabled = "false"

  allowed_dmz_cidrs        = ["${module.data-dmz-cidrs.cidrs}"]
  allowed_private_cidrs    = ["${module.data-private-cidrs.cidrs}"]
  allowed_additional_cidrs = []

  vpc_name                    = "${module.vpc-label.vpc_name}"
  vpc_link_expose_enabled     = "true"
  vpc_link_port               = "703"
  application_tier            = "service"
  beanstalk_service_role_name = "${module.vpc-label.beanstalk_service_role_name}"
  ec2_instance_profile_name   = "${module.vpc-label.beanstalk_ec2_profile_name}"
  keypair                     = "${module.vpc-label.beanstalk_keypair_name}"

  autoscale_min                  = "${module.config.beanstalk_autoscale_min}"
  autoscale_max                  = "${module.config.beanstalk_autoscale_max}"
  availability_zones             = "${module.config.beanstalk_availability_zones}"
  managed_updates_enabled        = "true"
  autoscale_lower_bound          = "20"
  autoscale_upper_bound          = "80"
  deployment_policy              = "${module.config.beanstalk_deployment_policy}"
  deployment_ignore_health_check = "${module.config.beanstalk_deployment_ignore_health_check}"
  rolling_update_enabled         = "${module.config.beanstalk_rolling_update_enabled}"
  rolling_update_type            = "${module.config.beanstalk_rolling_update_type}"
  updating_min_in_service        = "${module.config.beanstalk_updating_min_in_service}"
  updating_max_batch             = "${module.config.beanstalk_updating_max_batch}"

  env_vars = {
    AWS_REGION    = "${module.config.region}"
    APP_ENV       = "${module.label.environment}"
    DOTENV_CONFIG = "${module.config.beanstalk_dotenv_config}"
  }

  tags     = "${module.label.tags}"
  vpc_tags = "${module.vpc-label.tags}"
}
