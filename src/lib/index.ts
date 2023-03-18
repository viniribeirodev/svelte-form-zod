import { writable, get } from 'svelte/store';
import z from 'zod';

export type FormValues<T extends z.Schema> = z.infer<T>;

export function createForm<T extends z.Schema>({
	schema,
	initialValues,
	onSubmit
}: {
	schema?: T;
	initialValues?: Partial<FormValues<T>>;
	onSubmit?: (values: FormValues<T>) => void;
}) {
	const errors = writable<FormValues<T>>({});
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
						watch.update((w) => ({ ...w, [key]: (e.target as HTMLInputElement).value }));
						if (filterValues({ [key]: (e.target as HTMLInputElement).value }))
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

	function form(node: HTMLFormElement) {
		if (node) {
			node.addEventListener('submit', handleSubmit);
			target = node;
			if (initialValues) {
				Object.entries(initialValues).forEach(([key, value]) => {
					const input = node.querySelector(`[name="${key}"]`) as HTMLInputElement;
					if (input) {
						input.value = value as string;
						watch.update((w) => ({ ...w, [key]: value }));
					}
				});
			}
			handleInput();
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
		getValues,
		z
	};
}
