<script lang="ts">
	import { createForm, z } from '$lib';
	const schema = z.object({
		name: z.string().min(3).max(20),
		email: z.string().email(),
		phone: z.string(),
		password: z.string().min(6).max(20),
		cnpj: z.string(),
		formats: z.string().min(3).max(20),
		price: z.string(),
		date: z.string(),
		quantity: z.string(),
		custom: z.object({
			person: z.object({
				name: z.string().min(1, { message: 'Name is required' })
			})
		}),
		units: z
			.array(
				z.object({
					id: z.number(),
					name: z.string()
				})
			)
			.default([])
	});

	const { form, errors, watch, reset, updateField, updateFields } = createForm({
		schema,
		initialValues: {
			name: 'Test name',
			price: '0.0',
			units: [{ id: 1, name: 'Test name' }],
			custom: { person: { name: '' } }
		},
		masked: {
			name: 'text',
			phone: ['(99) 9999-9999', '(99) 9 9999-9999'],
			cnpj: '99.999.999/9999-99',
			formats: ['A-A', '9-9', '99-99'],
			price: 'currency',
			date: 'date',
			quantity: 'number'
		},
		onSubmit: async (values) => {
			console.log(values);
		}
	});
</script>

<form use:form>
	{JSON.stringify($watch.custom)}
	{$errors['custom.person.name']}
	<div style="display: flex; flex-direction: column; gap: 1rem;">
		<label for="name">Name</label>
		<input type="text" name="name" />
		{#if $errors.name}
			<span class="error">{$errors.name}</span>
		{/if}
		<label for="custom.person.name"> Custom</label>
		<input type="text" name="custom.person.name" />
		{#if $errors['custom.person.name']}
			<span class="error">{$errors['custom.person.name']}</span>
		{/if}
	</div>
	<div style="display: flex; flex-direction: column; gap: 1rem;">
		<label for="email">Email</label>
		<input type="email" name="email" />
		{#if $errors.email}
			<span class="error">{$errors.email}</span>
		{/if}
	</div>
	<div style="display: flex; flex-direction: column; gap: 1rem;">
		<label for="phone">Phone ['(99) 9999-9999', '(99) 9 9999-9999']</label>
		<input type="text" name="phone" />
		{#if $errors.phone}
			<span class="error">{$errors.phone}</span>
		{/if}
	</div>
	<div style="display: flex; flex-direction: column; gap: 1rem;">
		<label for="password">Password</label>
		<input type="password" name="password" />
		{#if $errors.password}
			<span class="error">{$errors.password}</span>
		{/if}
	</div>
	<div style="display: flex; flex-direction: column; gap: 1rem;">
		<label for="cnpj">CNPJ '99.999.999/9999-99'</label>
		<input type="text" name="cnpj" />
		{#if $errors.cnpj}
			<span class="error">{$errors.cnpj}</span>
		{/if}
	</div>
	<div style="display: flex; flex-direction: column; gap: 1rem;">
		<label for="formats">Formats ['A-A', '9-9', '99-99']</label>
		<input type="text" name="formats" />
		{#if $errors.formats}
			<span class="error">{$errors.formats}</span>
		{/if}
	</div>
	<div style="display: flex; flex-direction: column; gap: 1rem;">
		<label for="formats">Price - Currency</label>
		<input type="text" name="price" />
		{#if $errors.price}
			<span class="error">{$errors.price}</span>
		{/if}
	</div>
	<div style="display: flex; flex-direction: column; gap: 1rem;">
		<label for="formats">Date - date</label>
		<input type="text" name="date" />
		{#if $errors.date}
			<span class="error">{$errors.date}</span>
		{/if}
	</div>
	<div style="display: flex; flex-direction: column; gap: 1rem;">
		<label for="formats">Quantity - number</label>
		<input type="text" name="quantity" />
		{#if $errors.quantity}
			<span class="error">{$errors.quantity}</span>
		{/if}
	</div>
	<div>
		<button type="submit">Submit</button>
		<button type="button" on:click={() => reset()}>Reset</button>
	</div>
</form>

<style>
	form {
		display: flex;
		flex-direction: column;

		justify-content: center;
		gap: 1rem;
		width: 50%;
	}

	input {
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 0.25rem;
	}

	label {
		font-weight: 100;
		font-family: Verdana, Geneva, Tahoma, sans-serif;
	}

	button {
		cursor: pointer;
		padding: 0.5rem;
		border: 1px solid #ccc;
		border-radius: 0.25rem;
		background-color: #8423ed;
		color: #fff;
		font-weight: 100;
		font-family: Verdana, Geneva, Tahoma, sans-serif;
	}

	.error {
		color: red;
	}
</style>
