import { writable, get } from 'svelte/store';
import z from 'zod';

export type FormValues<T extends z.Schema> = z.infer<T>;
type FormErrros<T extends z.Schema> = { [key in keyof FormValues<T>]?: string };

interface PropsMaskedValue {
	value: string;
	pattern: string | string[];
}

function mask({ value, pattern }: PropsMaskedValue) {
	const LetterRegex = /[A-Z]/i;
	const NumberRegex = /[0-9]/;
	const specialRegex = /[^0-9A-Z]/gi;
	const arrPattern = Array.isArray(pattern) ? pattern : [pattern];
	let formatRegex: string[] = [];

	if (pattern === 'currency') {
		value = value.replace(/\D/g, '');
		value = (Number(value) / 100).toFixed(2) + '';
		value = value.replace('.', ',');
		value = value.replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1.');
		return value;
	}

	if (pattern === 'date') {
		//dd/mm/yyyy
		value = value.replace(/\D/g, '');
		value = value.replace(/(\d{2})(\d)/, '$1/$2');
		value = value.replace(/(\d{2})(\d)/, '$1/$2');
		value = value.replace(/(\d{4})(\d)/, '$1');

		return value;
	}

	if (pattern === 'text') {
		value = value.replace(/\d/g, '');
		return value;
	}

	if (pattern === 'number') {
		value = value.replace(/\D/g, '');
		return value;
	}

	value = value.replace(specialRegex, '');
	let arrValue = [...value];

	arrValue.forEach((v) => {
		if (LetterRegex.test(v)) formatRegex.push('[A-Z]');
		else if (NumberRegex.test(v)) formatRegex.push('[0-9]');
	});

	function searchPattern(): string | undefined {
		const checkPattern = arrPattern.some((p) => {
			const regex = new RegExp(formatRegex.join(''));
			if (regex.test(p.replace(specialRegex, ''))) return true;
			else return false;
		});

		if (checkPattern) {
			return arrPattern.find((p) => {
				const regex = new RegExp(formatRegex.join(''));
				if (regex.test(p.replace(specialRegex, ''))) return true;
				else return false;
			});
		} else {
			if (formatRegex.length > 1) {
				formatRegex = formatRegex.slice(0, formatRegex.length - 1);
				return searchPattern();
			} else return undefined;
		}
	}

	const findPattern = searchPattern();

	if (findPattern) {
		[...findPattern].forEach((p, i) => {
			if (p === 'A') {
				if (arrValue[i] !== undefined && LetterRegex.test(arrValue[i])) {
					arrValue[i] = arrValue[i].toUpperCase();
				} else if (arrValue.length) arrValue[i] = '';
			} else if (p === 'a') {
				if (arrValue[i] !== undefined && LetterRegex.test(arrValue[i])) {
					arrValue[i] = arrValue[i].toLowerCase();
				} else if (arrValue.length) arrValue[i] = '';
			} else if (p === 'Z') {
				if (
					arrValue[i] !== undefined &&
					(LetterRegex.test(arrValue[i]) || NumberRegex.test(arrValue[i]))
				) {
					arrValue[i] = arrValue[i].toUpperCase();
				} else if (arrValue.length) arrValue[i] = '';
			} else if (p === 'z') {
				if (
					arrValue[i] !== undefined &&
					(LetterRegex.test(arrValue[i]) || NumberRegex.test(arrValue[i]))
				) {
					arrValue[i] = arrValue[i].toLowerCase();
				} else if (arrValue.length) arrValue[i] = '';
			} else if (p == '9') {
				if (arrValue[i] === undefined || !NumberRegex.test(arrValue[i])) arrValue[i] = '';
			} else {
				if (arrValue[i] !== undefined) {
					if (i === 0 && arrValue[0] !== p) arrValue.unshift(p);
					else if (arrValue[i] !== p) arrValue.splice(i, 0, p);
				}
			}
		});

		arrValue = arrValue.slice(0, findPattern.length);
	}

	return arrValue.join('');
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
