pipeline {
    agent any

    environment {
        AWS_REGION = 'ap-south-1'
        AWS_ACCOUNT_ID = '133089468559'
        ECR_REPOSITORY = 'playchess-backend'
        IMAGE = "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${ECR_REPOSITORY}:latest"
    }

    stages {

        stage('Checkout') {
            steps {
                git branch: 'main',
                    url: 'https://github.com/kantariya/PlayChess.git'
            }
        }

        stage('Build Docker Image') {
            steps {
                dir('server') {
                    sh '''
                    docker build -t playchess-backend:latest .
                    docker tag playchess-backend:latest $IMAGE
                    '''
                }
            }
        }

        stage('Login to Amazon ECR') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-prod'
                ]]) {
                    sh '''
                    aws ecr get-login-password --region $AWS_REGION | \
                    docker login \
                    --username AWS \
                    --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
                    '''
                }
            }
        }

        stage('Push Image') {
            steps {
                sh '''
                docker push $IMAGE
                '''
            }
        }

        stage('Deploy to EC2') {
            steps {
                sshagent(credentials: ['playchess-ec2']) {
                    sh '''
                    ssh -o StrictHostKeyChecking=no ec2-user@13.233.75.40 \
                    "~/deploy.sh"
                    '''
                }
            }
        }
    }

    post {

        success {
            echo 'Deployment Successful'
        }

        failure {
            echo 'Deployment Failed'
        }

        always {
            sh 'docker image prune -f || true'
        }
    }
}