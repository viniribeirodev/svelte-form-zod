import { writable, get } from 'svelte/store';
import z from 'zod';

export type FormValues<T extends z.Schema> = z.infer<T>;
type FormErrros<T extends z.Schema> = { [key in keyof FormValues<T>]?: string };

interface PropsMaskedValue {
	value: string;
	pattern: string | string[];
}

function mask({ value, pattern }: PropsMaskedValue) {
	const LetterRegex = /[A-Za-z]/;
	const NumberRegex = /[0-9]/;
	const RemoveSpecialRegex = /[^0-9A-Z]/gi;

	value = value.replace(RemoveSpecialRegex, '');

	if (typeof pattern === 'object') {
		if (pattern.every((p) => p.replace(RemoveSpecialRegex, '').length < value.length)) {
			pattern = pattern[pattern.length - 1];
		} else {
			for (const ptt of pattern) {
				if (ptt.replace(RemoveSpecialRegex, '').length >= value.length) {
					pattern = ptt;
					break;
				}
			}
		}
	}

	const arrayPattern = [...pattern];
	let arrayValue = [...value];

	arrayValue = arrayValue.slice(0, pattern.toString().replace(RemoveSpecialRegex, '').length);

	arrayPattern.forEach((p, i) => {
		if (p === 'A') {
			if (arrayValue[i] !== undefined && LetterRegex.test(arrayValue[i])) {
				arrayValue[i] = arrayValue[i].toUpperCase();
			} else if (arrayValue.length) arrayValue[i] = '';
		} else if (p === 'a') {
			if (arrayValue[i] !== undefined && LetterRegex.test(arrayValue[i])) {
				arrayValue[i] = arrayValue[i].toLowerCase();
			} else if (arrayValue.length) arrayValue[i] = '';
		} else if (p === 'Z') {
			if (
				arrayValue[i] !== undefined &&
				(LetterRegex.test(arrayValue[i]) || NumberRegex.test(arrayValue[i]))
			) {
				arrayValue[i] = arrayValue[i].toUpperCase();
			} else if (arrayValue.length) arrayValue[i] = '';
		} else if (p === 'z') {
			if (
				arrayValue[i] !== undefined &&
				(LetterRegex.test(arrayValue[i]) || NumberRegex.test(arrayValue[i]))
			) {
				arrayValue[i] = arrayValue[i].toLowerCase();
			} else if (arrayValue.length) arrayValue[i] = '';
		} else if (p == '9') {
			if (arrayValue[i] === undefined || !NumberRegex.test(arrayValue[i])) arrayValue[i] = '';
		} else {
			if (value[i] !== undefined) {
				if (i === 0 && value[0] !== p) arrayValue.unshift(p);
				else if (value[i] !== p) arrayValue.splice(i, 0, p);
			}
		}
		value = arrayValue.join('');
	});

	return value;
}

export function createForm<T extends z.Schema>({
	schema,
	initialValues,
	onSubmit,
	masked
}: {
	schema?: T;
	initialValues?: Partial<FormValues<T>>;
	onSubmit?: (values: FormValues<T>) => void;
	masked?: { [key in keyof FormValues<T>]?: string | string[] };
}) {
	const errors = writable<FormErrros<T>>({});
	const watch = writable<FormValues<T>>({});

	let target: HTMLFormElement | null = null;

	const handleSubmit = (event: Event) => {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const values = Object.fromEntries(formData.entries()) as FormValues<T>;

		if (filterValues(values)) onSubmit && onSubmit(get(watch));
	};

	const filterValues = (values: Partial<FormValues<T>>) => {
		watch.update((w) => ({ ...w, ...values }));

		const watchValues = get(watch);
		const parsedValues = schema?.safeParse(watchValues);

		if (parsedValues && parsedValues?.success) {
			const data = parsedValues.data;

			watch.set(data);
			return true;
		} else if (parsedValues && !parsedValues?.success) {
			if (parsedValues.error.issues.length > 0) {
				const p = parsedValues.error.issues;

				const filterErrors = p
					.map((e) => {
						return {
							path: e.path[0],
							message: e.message
						};
					})
					.reduce((acc, cur) => {
						acc[cur.path] = cur.message;
						return acc;
					}, {} as FormValues<T>);
				errors.set(filterErrors);
			}
			return false;
		} else {
			return false;
		}
	};

	function updateField(key: keyof z.input<T>, value: any) {
		const input = target?.querySelector(`[name="${String(key)}"]`) as HTMLInputElement;
		if (input) {
			input.value = value;
			watch.update((w) => ({ ...w, [key]: value }));
			errors.update((e) => {
				delete e[key];
				return e;
			});
		} else {
			watch.update((w) => ({ ...w, [key]: value }));
			errors.update((e) => {
				delete e[key];
				return e;
			});
		}
	}

	function updateFields(values: Partial<z.input<T>>) {
		Object.entries(values).forEach(([key, value]) => {
			updateField(key as keyof FormValues<T>, value);
		});
	}

	function setError(key: keyof FormValues<T>, value: any) {
		errors.update((e) => ({ ...e, [key]: value }));
	}

	function setErrors(values: Partial<FormValues<T>>) {
		errors.update((e) => ({ ...e, ...values }));
	}

	function resetError(key: keyof FormValues<T>) {
		errors.update((e) => {
			delete e[key];
			return e;
		});
	}

	function resetErrors() {
		errors.set({});
	}

	function getValues() {
		const formData = new FormData(target as HTMLFormElement);
		const values = Object.fromEntries(formData.entries()) as FormValues<T>;
		return values;
	}

	function getValue(key: keyof FormValues<T>) {
		const values = getValues();
		return values[key];
	}

	function handleInput() {
		if (target) {
			const formData = new FormData(target as HTMLFormElement);

			formData.forEach((_value, key: FormValues<T>) => {
				const input = target?.querySelector(`[name="${key}"]`) as HTMLInputElement;
				if (input) {
					input.addEventListener('input', (e) => {
						if (masked && masked[key]) {
							const value = mask({
								value: (e.target as HTMLInputElement).value,
								pattern: masked[key] || ''
							});
							input.value = value;
							watch.update((w) => ({ ...w, [key]: value }));
						} else {
							watch.update((w) => ({ ...w, [key]: (e.target as HTMLInputElement).value }));
						}

						setErrors({ [key]: '' });
					});
				}
			});

			return {
				destroy() {
					formData.forEach((_value, key) => {
						const input = target?.querySelector(`[name="${key}"]`) as HTMLInputElement;
						if (input) {
							input.removeEventListener('input', (e) => {
								watch.update((w) => ({ ...w, [key]: (e.target as HTMLInputElement).value }));
							});
						}
					});
				}
			};
		}
	}

	function handlePaste() {
		if (target) {
			const formData = new FormData(target as HTMLFormElement);

			formData.forEach((_value, key: FormValues<T>) => {
				const input = target?.querySelector(`[name="${key}"]`) as HTMLInputElement;
				if (input) {
					input.addEventListener('paste', (e) => {
						if (masked && masked[key]) {
							const value = mask({
								value: (e.target as HTMLInputElement).value,
								pattern: masked[key] || ''
							});
							input.value = value;
							watch.update((w) => ({ ...w, [key]: value }));
						} else {
							watch.update((w) => ({ ...w, [key]: (e.target as HTMLInputElement).value }));
						}

						setErrors({ [key]: '' });
					});
				}
			});

			return {
				destroy() {
					formData.forEach((_value, key) => {
						const input = target?.querySelector(`[name="${key}"]`) as HTMLInputElement;
						if (input) {
							input.removeEventListener('paste', (e) => {
								watch.update((w) => ({ ...w, [key]: (e.target as HTMLInputElement).value }));
							});
						}
					});
				}
			};
		}
	}

	function form(node: HTMLFormElement) {
		if (node) {
			node.addEventListener('submit', handleSubmit);
			target = node;
			if (initialValues) {
				Object.entries(initialValues).forEach(([key, value]) => {
					const input = node.querySelector(`[name="${key}"]`) as HTMLInputElement;
					if (input) {
						if (input.type === 'checkbox') {
							input.checked = value as boolean;
						} else {
							input.value = value as string;
						}
						watch.update((w) => ({ ...w, [key]: value }));
					}
				});
			}
			handleInput();
			handlePaste();
			return {
				destroy() {
					node.removeEventListener('submit', handleSubmit), (target = null);
				}
			};
		}
	}

	const reset = () => {
		errors.set({});
		target?.reset();
		watch.set({ ...initialValues });
	};

	return {
		initialValues,
		errors,
		watch,
		form,
		reset,
		updateField,
		updateFields,
		setError,
		setErrors,
		resetError,
		resetErrors,
		getValue,
		getValues
	};
}

export { z };
