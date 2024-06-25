awslocal sqs create-queue --queue-name be_mail_dead_letter
awslocal sqs create-queue --queue-name be_mail --attributes file:///configs/be-mail-queue.json
awslocal sqs create-queue --queue-name cms_mail_dead_letter
awslocal sqs create-queue --queue-name cms_mail --attributes file:///configs/cms-mail-queue.json
awslocal sqs create-queue --queue-name panic_mode_dead_letter
awslocal sqs create-queue --queue-name panic_mode --attributes file:///configs/panic-mode-queue.json