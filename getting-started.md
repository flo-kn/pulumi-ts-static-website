### Getting Started

#### Prerequs

- AWS Account
- Pulumi installed
- AWS CLI v2 Installed


Verify that you are logged onto the right account with the right user
```sh
$ aws sts get-caller-identity --profile <your-profile-name>
```

Choose a name for your [Pulumi Backend](https://www.pulumi.com/docs/intro/concepts/state/) 


```sh
export PULUMI_BACKEND=<your-pulumi-backend-name>
```
and create it by following
```sh
$ aws s3 mb s3://$PULUMI_BACKEND
```

Login to Pulumi Backend:
```sh
$ pulumi login s3://$PULUMI_BACKEND
```

Build the project:
```sh 
$ yarn
```
Choose a name for your Pulumi Stack

```sh
export PULUMI_STACK_NAME=<your-stack-name>
```

```sh 
pulumi stack init $PULUMI_STACK_NAME
```

Preview the deployment
```sh 
$ pulumi preview
```

Deploy with:
```sh 
$ pulumi up
```