# ec2-tool

A command-line tool for interacting with aws ec2 instances faster.

***

**Disclaimer:** This is a personal convenience tool. Use it at your own risk.

***

### Prerequisites

* AWS Access Key ID and Secret Access Key. Get these from your AWS account. [Here](http://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_access-keys.html#Using_CreateAccessKey) is how.


### Install

```
$ npm install -g ec2-tool
```

Configure a profile with your AWS credentials and the location of your `.pem` files. 


```
 $ ec2 configure
 profile  (default) 
 region  (us-east-1) 
 output (json) 
 access key id  KROAKRKWPFLKPDSGKFASSFEA 
 secret access key  jty34JFDSAFNDSAKSAJEOe9afhidnafneqwjkfs
 private keys  $HOME/.aws/keys
```


### Usage

```
$ ec2
NAME:
    ec2  -  Command-line interface to common ec2 operations.
USAGE:
    ec2 <command> [parameters]

COMMANDS:
  ls                   list ec2 instances
  ssh                  Connect to an ec2 instance via ssh.
  select               selector for ec2 instances
  mount                Mount an ec2 instance locally via sshfs.
  umount               Unmount a locally mounted ec2 instance
  start                start existing ec2 instances
  stop                 stop existing ec2 instances
  terminate            terminate existing ec2 instances
  configure            Configure AWS credentials.
  help                 display help

OPTIONS

  --profile            The AWS profile to use.

```


### Commands

***



#### ec2 configure

* Configure your AWS credentials and directory of private keys (.pem):


```
 $ ec2 configure

  profile  (default) 
  region  (us-east-1) 
  access key id  "access_key"
  secret access key "secret_access_key"  
  private keys  

```




***


#### ec2 ls 

* Lists ec2 instances for the authenticated user.

```
instance-id				state		name	

i-3b4e3e35				stopped		bigchaindb		
i-4044fa616243879cfb5	running		test_a		
i-008042f3teep77e408	running		test_b	


```

***

##### ec2 ssh


Open an ssh connection for the instance with name = "momo".

* **[ kidwai ] $** ec2 ssh -n momo


***

##### ec2 mount

* **[ kidwai ] $** ec2 mount -n momo   # connects to the first instance named "momo"
* **[ kidwai ] $** ec2 umount -n momo  # disconnects from any instances named "momo"


