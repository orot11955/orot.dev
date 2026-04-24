pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    YARN_CACHE_FOLDER = "${WORKSPACE}/.yarn-cache"

    DEPLOY_BRANCH = 'main'
    DEPLOY_HOST = 'pulse.home'
    DEPLOY_USER = 'deploy'
    DEPLOY_PATH = '/home/orot/orot.dev'
    DEPLOY_SSH_CREDENTIALS_ID = 'deploy-ssh-key'
  }

  stages {
    stage('Checkout') {
      steps {
        checkout scm
      }
    }

    stage('Install Dependencies') {
      steps {
        sh '''
          set -eu
          corepack enable
          corepack prepare yarn@1.22.22 --activate
          yarn --cwd orot-api install --frozen-lockfile
          yarn --cwd orot-web install --frozen-lockfile
        '''
      }
    }

    stage('Test') {
      steps {
        sh '''
          set -eu
          yarn test:ci
        '''
      }
    }

    stage('Deploy') {
      when {
        expression {
          env.BRANCH_NAME == env.DEPLOY_BRANCH || env.GIT_BRANCH == "origin/${env.DEPLOY_BRANCH}"
        }
      }
      steps {
        sshagent(credentials: ["${DEPLOY_SSH_CREDENTIALS_ID}"]) {
          sh '''
            set -eu
            ssh -o StrictHostKeyChecking=accept-new "${DEPLOY_USER}@${DEPLOY_HOST}" "
              set -eu
              cd '${DEPLOY_PATH}'
              git fetch origin '${DEPLOY_BRANCH}'
              git checkout '${DEPLOY_BRANCH}'
              git pull --ff-only origin '${DEPLOY_BRANCH}'
              corepack enable
              corepack prepare yarn@1.22.22 --activate
              yarn docker:check
              yarn docker:all:up
            "
          '''
        }
      }
    }
  }

  post {
    always {
      cleanWs(
        deleteDirs: true,
        disableDeferredWipeout: true,
        notFailBuild: true,
        patterns: [
          [pattern: '.yarn-cache/**', type: 'INCLUDE']
        ]
      )
    }
  }
}
