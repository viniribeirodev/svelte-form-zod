import { writable, get } from 'svelte/store';
import z from 'zod';

interface PropsMaskedValue {
	value: string;
	pattern: string | string[];
}

type NestedKeyOf<ObjectType extends object> = {
	[Key in keyof ObjectType & (string | number)]: ObjectType[Key] extends object
		? `${Key}` | `${Key}.${NestedKeyOf<ObjectType[Key]>}`
		: `${Key}`;
}[keyof ObjectType & (string | number)];

function flattenObject(obj: any, parentKey = '', result: any = {}) {
	for (let key in obj) {
		if (obj.hasOwnProperty(key)) {
			const newKey = parentKey ? `${parentKey}.${key}` : key;
			if (typeof obj[key] === 'object' && obj[key] !== null) {
				flattenObject(obj[key], newKey, result);
			} else {
				result[newKey] = obj[key];
			}
		}
	}
	return result;
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
	initialValues?: Partial<z.infer<T>>;
	onSubmit?: (values: z.infer<T>) => void;
	masked?: { [key in NestedKeyOf<z.input<T>>]?: string | string[] };
}) {
	const errors = writable<{ [key in NestedKeyOf<z.input<T>>]?: string }>({});
	const watch = writable<z.infer<T>>({ ...(initialValues && { ...initialValues }) });

	let target: HTMLFormElement | null = null;

	const handleSubmit = (event: Event) => {
		event.preventDefault();
		const formData = new FormData(event.target as HTMLFormElement);
		const values = Object.fromEntries(formData.entries()) as z.infer<T>;

		if (filterValues(values)) onSubmit && onSubmit(get(watch));
	};

	const filterValues = (values: Partial<z.infer<T>>) => {
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
							path: e.path.join('.'),
							message: e.message
						};
					})
					.reduce((acc, cur) => {
						acc[cur.path] = cur.message;
						return acc;
					}, {} as z.infer<T>);
				errors.set(filterErrors);
			}
			return false;
		} else {
			return false;
		}
	};

	function updateField(key: NestedKeyOf<z.input<T>>, value: any) {
		const keys = key.split('.') as (keyof T)[];
		const lastKey = keys.pop() as keyof T;
		let target = get(watch);

		keys.forEach((k) => {
			if (!target[k]) {
				target[k] = {};
			}
			target = target[k];
		});
		target[lastKey] = value;
		watch.update((w: T) => ({ ...w, ...target }));
		errors.update((e) => {
			delete e[key];
			return e;
		});
		const input = document.querySelector(`[name="${key}"]`) as HTMLInputElement;

		if (input) {
			input.value = value;
		}
	}

	function updateFields(values: Partial<Record<NestedKeyOf<z.input<T>>, any>>) {
		Object.entries(flattenObject(values)).forEach(([key, value]) => {
			updateField(key as NestedKeyOf<z.input<T>>, value);
		});
	}

	function setError(key: NestedKeyOf<z.input<T>>, value: any) {
		errors.update((e) => ({ ...e, [key]: value }));
	}

	function setErrors(values: Partial<z.infer<T>>) {
		errors.update((e) => ({ ...e, ...values }));
	}

	function resetError(key: NestedKeyOf<z.input<T>>) {
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
		const values = Object.fromEntries(formData.entries()) as z.infer<T>;
		return values;
	}

	function getValue(key: NestedKeyOf<z.input<T>>) {
		const values = getValues();
		return values[key];
	}

	// function handleInput() {
	// 	if (target) {
	// 		const formData = new FormData(target as HTMLFormElement);
	// 		formData.forEach((_value, key: z.infer<T>) => {
	// 			const input = target?.querySelector(`[name="${key}"]`) as HTMLInputElement;
	// 			if (input) {
	// 				input.addEventListener('input', (e) => {
	// 					if (masked && masked[key]) {
	// 						const value = mask({
	// 							value: (e.target as HTMLInputElement).value,
	// 							pattern: masked[key] || ''
	// 						});
	// 						input.value = value;
	// 						watch.update((w) => ({ ...w, [key]: value }));
	// 					} else {
	// 						watch.update((w) => ({ ...w, [key]: (e.target as HTMLInputElement).value }));
	// 					}

	// 					setErrors({ [key]: '' });
	// 				});
	// 			}
	// 		});

	// 		return {
	// 			destroy() {
	// 				formData.forEach((_value, key) => {
	// 					const input = target?.querySelector(`[name="${key}"]`) as HTMLInputElement;
	// 					if (input) {
	// 						input.removeEventListener('input', (e) => {
	// 							watch.update((w) => ({ ...w, [key]: (e.target as HTMLInputElement).value }));
	// 						});
	// 					}
	// 				});
	// 			}
	// 		};
	// 	}
	// }

	function handleInput() {
		if (target) {
			const formData = new FormData(target as HTMLFormElement);
			formData.forEach((_value, key: z.infer<T>) => {
				const input = target?.querySelector(`[name="${key}"]`) as HTMLInputElement;

				if (input) {
					const handleInputEvent = (e: Event) => {
						const value = (e.target as HTMLInputElement).value;

						if (masked && masked[key]) {
							const maskedValue = mask({
								value: value,
								pattern: masked[key] || ''
							});
							input.value = maskedValue;
							updateField(key, maskedValue);
						} else {
							updateField(key, value);
						}
						setErrors({ [key]: '' });
					};

					input.addEventListener('input', handleInputEvent);
					input.dataset.handleInputEvent = handleInputEvent.toString();
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

			formData.forEach((_value, key: z.infer<T>) => {
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
		watch.set(initialValues);
		errors.set({});
		target?.reset();
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
