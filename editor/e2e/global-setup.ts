import fs from 'node:fs';
import path from 'node:path';

const TMP = path.resolve('e2e/.tmp-songs');
const TMP_BOOKS = path.resolve('e2e/.tmp-songbooks');

const SEED = `{title:Stella del mattino}
{tag:Varie}

[Do]Stella del mattino brilla
nel [Sol]cielo di settembre
`;

export default function globalSetup() {
	fs.rmSync(TMP, { recursive: true, force: true });
	fs.mkdirSync(path.join(TMP, 'clan'), { recursive: true });
	fs.mkdirSync(path.join(TMP, 'reparto'), { recursive: true });
	fs.mkdirSync(path.join(TMP, 'varie'), { recursive: true });
	fs.writeFileSync(path.join(TMP, 'varie', 'stella_del_mattino.cho'), SEED, 'utf-8');

	fs.rmSync(TMP_BOOKS, { recursive: true, force: true });
	fs.mkdirSync(TMP_BOOKS, { recursive: true });
	fs.writeFileSync(
		path.join(TMP_BOOKS, 'uscita_2026.txt'),
		'varie/stella_del_mattino.cho\n',
		'utf-8'
	);
}
