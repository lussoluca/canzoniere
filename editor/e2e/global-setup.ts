import fs from 'node:fs';
import path from 'node:path';

const TMP = path.resolve('e2e/.tmp-songs');

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
}
