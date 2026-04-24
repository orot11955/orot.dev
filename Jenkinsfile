pipeline {
  agent any

  options {
    timestamps()
    disableConcurrentBuilds()
    buildDiscarder(logRotator(numToKeepStr: '20'))
  }

  environment {
    YARN_CACHE_FOLDER = "${WORKSPACE}/.yarn-cache"
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
          command -v node
          command -v yarn
          node --version
          yarn --version
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
        sshagent(credentials: [env.DEPLOY_SSH_CREDENTIALS_ID]) {
          sh '''
            set -eu
            : "${DEPLOY_BRANCH:?Missing Jenkins environment variable: DEPLOY_BRANCH}"
            : "${DEPLOY_TARGET:?Missing Jenkins environment variable: DEPLOY_TARGET}"
            : "${DEPLOY_PATH:?Missing Jenkins environment variable: DEPLOY_PATH}"
            : "${DEPLOY_SSH_CREDENTIALS_ID:?Missing Jenkins environment variable: DEPLOY_SSH_CREDENTIALS_ID}"

            ssh -o StrictHostKeyChecking=accept-new "$DEPLOY_TARGET" "
              set -eu
              cd '${DEPLOY_PATH}'
              git fetch origin '${DEPLOY_BRANCH}'
              git checkout '${DEPLOY_BRANCH}'
              git pull --ff-only origin '${DEPLOY_BRANCH}'
              command -v yarn
              yarn --version
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
