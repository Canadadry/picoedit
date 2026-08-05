NVM_SH := $(HOME)/.nvm/nvm.sh

.PHONY: install test cli

install:
	bash -c 'source $(NVM_SH) && npm install'
	sh scripts/git-hooks/install.sh

test:
	bash -c 'source $(NVM_SH) && npm test'

cli:
	bash -c 'source $(NVM_SH) && npm run cli -- $(ARGS)'
