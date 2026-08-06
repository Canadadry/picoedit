NVM_SH := $(HOME)/.nvm/nvm.sh

.PHONY: install test cli dev build

install:
	bash -c 'source $(NVM_SH) && npm install'
	sh scripts/git-hooks/install.sh

test:
	bash -c 'source $(NVM_SH) && npm test'

cli:
	bash -c 'source $(NVM_SH) && npm run cli -- $(ARGS)'

dev:
	bash -c 'source $(NVM_SH) && npm run dev'

build:
	bash -c 'source $(NVM_SH) && npm run build'
