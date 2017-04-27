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

i-3b404bc				running		momo-a
i-40404b3240rb4b43n45			stopped		momo-b

```

***

##### ec2 ssh

* Open an ssh connection with an ec2 instance.

```
$ ec2 ssh -n momo
Welcome to Ubuntu 16.04.1 LTS (GNU/Linux 4.4.0-72-generic x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/advantage

  Get cloud support with Ubuntu Advantage Cloud Guest:
    http://www.ubuntu.com/business/services/cloud

94 packages can be updated.
0 updates are security updates.


ubuntu@ip-172-31-27-62:~$ 
```


***

##### ec2 mount

* Mount the first instance named "momo"

```
 $ ec2 mount -n momo
```

* Unmount the first instance named momo


```
 $ ec2 umount -n momo
```


##### ec2 start,stop,terminate

* Start,stop, or terminate an ec2 instance.

```
 $ ec2 start -n zainab
 $ ec2 stop -n momo
 $ ec2 terminate -i i-34b4b5b3b3
```

