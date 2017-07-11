# ec2-tool

A command-line tool for interacting with aws ec2 instances faster.

### Requirements

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
  sftp                 Transfer files over sftp with an ec2 instance
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



#### configure

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


#### ls 

* Lists ec2 instances for the authenticated user.


```sh
state        ip            name                           

running   39.252.82.0     website
running   33.223.64.12    light
```

***

##### ssh

* Open an ssh connection with an ec2 instance.

```sh
$ ec2 ssh -n website

ubuntu@ip-172-31-27-62:~$ 
```

* Execute a command remotely and return the output

```sh
$ ec2 ssh -n website -c "df -h"
Filesystem      Size  Used Avail Use% Mounted on
udev            2.0G     0  2.0G   0% /dev
tmpfs           396M   41M  355M  11% /run
/dev/xvda1       49G   39G  9.5G  81% /
tmpfs           2.0G     0  2.0G   0% /dev/shm
tmpfs           5.0M     0  5.0M   0% /run/lock
tmpfs           2.0G     0  2.0G   0% /sys/fs/cgroup
tmpfs           396M     0  396M   0% /run/user/1000
```
***

##### sftp

* Open an sftp session with an ec2 instance.

```
$ ec2 sftp -n website
Connected to 39.252.82.0.
sftp> get -r /logs
```


***



#### mount

* Mount the first instance named "website".

***


```sh
 $ ec2 mount -n website
 Mounted 39.252.82.0 to /mnt/ssd/software/nodejs/ec2-tool/website
```

* Mount the first instance named "website" to a custom mount point.

```sh
$ ec2 mount -n website -m
```



#### umount

* Unmount the first instance named website


***


```sh
 $ ec2 umount -n website
Unmounted 39.252.82.0 from /mnt/ssd/software/nodejs/ec2-tool/website
```

***

#### start,stop,terminate

* Start,stop, or terminate an ec2 instance.

```
 $ ec2 stop -n website
 $ ec2 start -n light
 $ ec2 terminate -i i-34b4b5b3b3
```

### Profiles


Multiple profiles can be configured then supplied with '--profile':

```sh
$ ec2 configure 
 profile: (default)  test
 region:  (us-east-1) us-east-1
 access key id "access_key_id"
 secret access key "secret_access_key"


$ ec2 --profile test ssh -n test -c "ps aux | grep geth"
ubuntu     516  1.2 10.6 1965968 431152 ?      Sl   Jun23 313:17 geth --testnet --rpc --port 30304 --rpcport 8547 --password /dev/fd/63 --unlock 0
ubuntu    9497  0.0  0.0  11240  2940 ?        Ss   05:38   0:00 bash -c ps aux | grep geth
ubuntu    9499  0.0  0.0  12948   976 ?        S    05:38   0:00 grep geth
```

