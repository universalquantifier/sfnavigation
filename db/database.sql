CREATE DATABASE sf_navigation;

--CREATE USER 'exp'@'localhost' IDENTIFIED BY 'password';

GRANT ALL ON sf_navigation.* to 'exp'@'localhost';

USE sf_navigation;

CREATE TABLE log_data (
   id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
   created_on timestamp DEFAULT CURRENT_TIMESTAMP,
   worker_id varchar(50) NOT NULL,
   assignment_id varchar(50) NOT NULL,
   hit_id varchar(50) NOT NULL,
   remote_ip varchar(20),
   extra mediumtext,
   log mediumtext
);

CREATE TABLE game_data (
   id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
   created_on timestamp DEFAULT CURRENT_TIMESTAMP,
   worker_id varchar(50) NOT NULL,
   assignment_id varchar(50) NOT NULL,
   hit_id varchar(50) NOT NULL,
   remote_ip varchar(20),
   session_id bigint NOT NULL,
   game_number int,
   keylog mediumtext,
   events mediumtext,
   log mediumtext
);

CREATE TABLE log_block (
   id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
   created_on timestamp DEFAULT CURRENT_TIMESTAMP,
   worker_id varchar(50) NOT NULL,
   assignment_id varchar(50) NOT NULL,
   hit_id varchar(50) NOT NULL,
   remote_ip varchar(20),
   session_id bigint NOT NULL,
   sync_id int,
   log mediumtext
);

CREATE TABLE condition_pool (
       id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
       exp_condition varchar(50) NOT NULL
);

CREATE TABLE resume (
       worker_id varchar(50) NOT NULL,
       idx varchar(50),
       reward varchar(50),
       game_reward varchar(50),
       game_points varchar(50),
       rect_width varchar(50),
       rect_length varchar(50),
       exp_condition varchar(50),
       assignment_id varchar(50) NOT NULL,
       note varchar(50)
);

-- Every time the resume table is updated, a line in this table is
-- added to record that change.
CREATE TABLE progress_log (
       worker_id varchar(50) NOT NULL,
       assignment_id varchar(50) NOT NULL,
       created_on timestamp DEFAULT CURRENT_TIMESTAMP,
       remote_ip varchar(20),
       idx varchar(50),
       reward varchar(50),
       game_reward varchar(50),
       game_points varchar(50),
       rect_width varchar(50),
       rect_length varchar(50),
       exp_condition varchar(50)
);

-- Every time a resume is requested, it gets logged.
CREATE TABLE resume_log (
       worker_id varchar(50) NOT NULL,
       assignment_id varchar(50) NOT NULL,
       created_on timestamp DEFAULT CURRENT_TIMESTAMP,
       remote_ip varchar(20),
       idx varchar(50),
       reward varchar(50),
       game_reward varchar(50),
       game_points varchar(50),
       rect_width varchar(50),
       rect_length varchar(50),
       exp_condition varchar(50)
);

-- Record the condition for each worker. This way each condition is
-- accountable to someone. Even if the worker never gets past the
-- consent page.
CREATE TABLE condition_log (
       worker_id varchar(50) NOT NULL,
       created_on timestamp DEFAULT CURRENT_TIMESTAMP,
       exp_condition varchar(50),
       remote_ip varchar(20)
);

CREATE TABLE rejects (
       id int NOT NULL AUTO_INCREMENT PRIMARY KEY,
       worker_id varchar(50) NOT NULL,
       note varchar(50)
);

CREATE TABLE reject_log (
       worker_id varchar(50) NOT NULL,
       created_on timestamp DEFAULT CURRENT_TIMESTAMP,
       remote_ip varchar(20),
       reason varchar(50)
);

delimiter //

CREATE PROCEDURE cleardb ()
BEGIN
    truncate log_data;
    truncate game_data;
    truncate log_block;
    truncate condition_pool;
    truncate resume;
    truncate progress_log;
    truncate resume_log;
    truncate condition_log;
    truncate reject_log;
END //

delimiter ;
