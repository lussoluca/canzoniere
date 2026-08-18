// Where the reader got to in the "study this song" panel, per song, so
// reopening it lands on the step they were working on.

export type StudyStep = 'chords' | 'changes' | 'play';

const STEPS: StudyStep[] = ['chords', 'changes', 'play'];

function key(category: string, slug: string): string {
	return `reader:study:${category}/${slug}`;
}

export function loadStudyStep(category: string, slug: string): StudyStep {
	if (typeof localStorage === 'undefined') return 'chords';
	const v = localStorage.getItem(key(category, slug));
	return STEPS.includes(v as StudyStep) ? (v as StudyStep) : 'chords';
}

export function saveStudyStep(category: string, slug: string, step: StudyStep): void {
	if (typeof localStorage === 'undefined') return;
	try {
		if (step === 'chords') localStorage.removeItem(key(category, slug));
		else localStorage.setItem(key(category, slug), step);
	} catch {
		// storage full or unavailable: the panel just always opens on step one
	}
}
