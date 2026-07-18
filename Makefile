.PHONY: editor build events export-chordpro-config

editor:
	cd editor && npm run dev

build:
	@rm -f canzoniere.pdf
	docker run -v ${PWD}:/data -w /data chordpro/chordpro:latest chordpro canzoni/**/*.cho --output=canzoniere.pdf --config=modern3 --transcode=latin --config=chordpro.json --front-matter=front.pdf --back-matter=back.pdf

events:
	@rm -f canzonieri/*.pdf
	cd printer && go build -o printer .
	@for f in canzonieri/*.txt; do \
		out=$${f%.txt}.pdf; \
		echo "Building $$out"; \
		./printer/printer -input=$$f -output=$$out -songs=canzoni; \
	done

export-chordpro-config:
	@rm -f canzoniere.pdf
	docker run -v ${PWD}:/data -w /data chordpro/chordpro:latest chordpro --config=modern3 --config=chordpro.json --print-final-config > config.json
