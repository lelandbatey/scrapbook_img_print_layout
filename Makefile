

.PHONY: all
all: ./node_modules/.bin/tsc
	./node_modules/.bin/tsc --lib dom,dom.iterable,es2023 --target es2019 lib.ts util.ts

./node_modules/.bin/tsc:
	npm install --save-dev typescript

.PHONY: serve
serve:
	python3 -c "from http.server import test, SimpleHTTPRequestHandler as RH; RH.extensions_map['.html'] = 'text/html;charset=UTF-8'; test(RH)"


