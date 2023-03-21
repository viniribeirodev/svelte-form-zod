<script lang="ts">
	import { createForm, z } from '$lib';

	const schema = z.object({
		name: z.string().min(3).max(20),
		email: z.string().email(),
		phone: z.string(),
		password: z.string().min(6).max(20),
		cnpj: z.string()
	});

	const { form, errors } = createForm({
		schema,
		masked: {
			name: 'AAA',
			phone: ['(99) 9999-9999', '(99) 9 9999-9999'],
			cnpj: '99.999.999/9999-99'
		},
		onSubmit: async (values) => {
			console.log(values);
		}
	});
</script>

<form use:form>
	<label for="name">Name</label>
	<input type="text" name="name" />
	{#if $errors.name}
		<p>{$errors.name}</p>
	{/if}

	<label for="email">Email</label>
	<input type="email" name="email" />
	{#if $errors.email}
		<p>{$errors.email}</p>
	{/if}

	<label for="phone">Phone</label>
	<input type="text" name="phone" />
	{#if $errors.phone}
		<p>{$errors.phone}</p>
	{/if}

	<label for="password">Password</label>
	<input type="password" name="password" />
	{#if $errors.password}
		<p>{$errors.password}</p>
	{/if}

	<label for="cnpj">CNPJ</label>
	<input type="text" name="cnpj" />
	{#if $errors.cnpj}
		<p>{$errors.cnpj}</p>
	{/if}

	<button type="submit">Submit</button>
</form>
