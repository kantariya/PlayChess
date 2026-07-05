pipeline {
    agent any

    environment {
        AWS_REGION = 'ap-south-1'
        S3_BUCKET = 'playchess-frontend'
        CLOUDFRONT_DISTRIBUTION = 'EB9KW1R1W7NJZ'
    }

    stages {

        stage('Build React') {
            steps {
                dir('client') {
                    sh '''
                    npm install
                    npm run build
                    '''
                }
            }
        }

        stage('Upload to S3') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-prod'
                ]]) {
                    dir('client') {
                        sh '''
                        aws s3 sync dist/ s3://$S3_BUCKET --delete
                        '''
                    }
                }
            }
        }

        stage('Invalidate CloudFront') {
            steps {
                withCredentials([[
                    $class: 'AmazonWebServicesCredentialsBinding',
                    credentialsId: 'aws-prod'
                ]]) {
                    sh '''
                    aws cloudfront create-invalidation \
                      --distribution-id $CLOUDFRONT_DISTRIBUTION \
                      --paths "/*"
                    '''
                }
            }
        }
    }

    post {
        success {
            echo 'Frontend Deployment Successful'
        }

        failure {
            echo 'Frontend Deployment Failed'
        }
    }
}