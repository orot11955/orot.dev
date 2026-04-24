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
          mkdir -p "$WORKSPACE/.corepack-bin"
          corepack enable --install-directory "$WORKSPACE/.corepack-bin"
          export PATH="$WORKSPACE/.corepack-bin:$PATH"
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
          export PATH="$WORKSPACE/.corepack-bin:$PATH"
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
        script {
          def missingEnv = ''

          if (!env.DEPLOY_BRANCH?.trim()) {
            missingEnv = "${missingEnv} DEPLOY_BRANCH"
          }
          if (!env.DEPLOY_TARGET?.trim()) {
            missingEnv = "${missingEnv} DEPLOY_TARGET"
          }
          if (!env.DEPLOY_PATH?.trim()) {
            missingEnv = "${missingEnv} DEPLOY_PATH"
          }
          if (!env.DEPLOY_SSH_CREDENTIALS_ID?.trim()) {
            missingEnv = "${missingEnv} DEPLOY_SSH_CREDENTIALS_ID"
          }

          if (missingEnv.trim()) {
            error "Missing Jenkins environment variables:${missingEnv}"
          }
        }

        sshagent(credentials: [env.DEPLOY_SSH_CREDENTIALS_ID]) {
          sh '''
            set -eu
            ssh -o StrictHostKeyChecking=accept-new "$DEPLOY_TARGET" "
              set -eu
              cd '${DEPLOY_PATH}'
              git fetch origin '${DEPLOY_BRANCH}'
              git checkout '${DEPLOY_BRANCH}'
              git pull --ff-only origin '${DEPLOY_BRANCH}'
              mkdir -p .corepack-bin
              corepack enable --install-directory \"\$PWD/.corepack-bin\"
              export PATH=\"\$PWD/.corepack-bin:\$PATH\"
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
