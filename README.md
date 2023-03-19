<p align="center">
  <img src="https://raw.githubusercontent.com/viniribeirodev/svelte-form-zod/c86220e09830eba1771d06c7f6727ca96202ed62/svelte-forms-zod-b.svg" width="200px" align="center" alt="Zod logo" />
</p>

<h1 align="center">Svelte Form Zod</h1>

<p align="center">
 <a href="https://npm-stat.com/charts.html?package=svelte-form-zod">
    <img src="https://img.shields.io/npm/dm/svelte-form-zod.svg">
  </a>
  <a href="https://coveralls.io/github/viniribeirodev/svelte-form-zod?branch=master">
    <img src="https://coveralls.io/repos/github/viniribeirodev/svelte-form-zod/badge.svg?branch=master">
  </a>
   <a href="https://snyk.io/test/github/viniribeirodev/svelte-form-zod">
    <img src="https://snyk.io/test/github/viniribeirodev/svelte-form-zod/badge.svg" alt="Known Vulnerabilities" data-canonical-src="https://snyk.io/test/github/viniribeirodev/svelte-form-zod" style="max-width:100%;">
  </a>
  <a href="https://www.npmjs.com/package/svelte-form-zod">
    <img src="https://badge.fury.io/js/svelte-form-zod.svg">
  </a>
</p>

<p align="center">
    🔒 Biblioteca para formulários com SvelteKit e Zod. 🔒  
</p>

## Sobre

Svelte Form Zod é uma biblioteca de formulários para SvelteKit que usa Zod para validação de dados.

## Instalação

```bash
npm install svelte-form-zod

ou

yarn add svelte-form-zod
```

## Como usar

### Criando um formulário

Para criar um formulário, você precisa criar um arquivo `.svelte` e importar a função `createForm` e o `z` do Zod.

```svelte
<script lang="ts">
	import { createForm, z } from 'svelte-form-zod';

	const schema = z.object({
		name: z.string().min(3).max(50),
		email: z.string().email(),
		password: z.string().min(6).max(50)
	});

	const initialValues = {
		name: '',
		email: '',
		password: ''
	};

	const onSubmit = (values) => {
		const { name, email, password } = values;
		console.log(name, email, password);
	};

	const { form, errors } = createForm({
		schema,
		initialValues,
		onSubmit
	});
</script>

<form use:form>
	<label>
		<input type="text" name="name" />
		{#if $errors.name}
			<span>{$errors.name}</span>
		{/if}
	</label>
	<label>
		<input type="text" name="email" />
		{#if $errors.email}
			<span>{$errors.email}</span>
		{/if}
	</label>
	<label>
		<input type="password" name="password" />
		{#if $errors.password}
			<span>{$errors.password}</span>
		{/if}
	</label>

	<button type="submit">Enviar</button>
</form>
```

## `createForm`

- <strong>schema</strong> - Esquema de validação do formulário
- <strong>initialValues</strong> - Objeto com os valores iniciais do formulário
- <strong>onSubmit</strong> - Função que será executada quando o formulário for submetido
- <strong>errors</strong> - Objeto com os erros de validação do formulário
- <strong>watch</strong> - Objeto com os valores dos campos do formulário
- <strong>form</strong> - Objeto use:form do formulário Svelte
- <strong>reset</strong> - Função que reseta o formulário para os valores iniciais
- <strong>updateField</strong> - Função que atualiza um campo específico do formulário
- <strong>updateFields</strong> - Função que atualiza vários campos do formulário
- <strong>setError</strong> - Função que define um erro de validação para um campo específico do formulário
- <strong>setErrors</strong> - Função que define vários erros de validação para o formulário
- <strong>resetError</strong> - Função que remove o erro de validação de um campo específico do formulário
- <strong>resetErrors</strong> - Função que remove todos os erros de validação do formulário
- <strong>getValue</strong> - Função que retorna o valor de um campo específico do formulário
- <strong>getValues</strong> - Função que retorna um objeto com os valores de todos os campos do formulário

## `errors`

```ts
const { form, errors, setError, setErrors, resetError, resetErrors } = createForm({
    schema,
    initialValues,
    onSubmit
})

{#if $errors.name}
    <span>{$errors.name}</span>
{/if}

setError('name', 'Nome inválido')
setErrors({
    name: 'Nome inválido',
    email: 'Email inválido'
})

resetError('name')
resetErrors()
```

## `watch`

```ts
const { form, watch } = createForm({
    schema,
    initialValues,
    onSubmit
})

{#if $watch.name}
    <span>{$watch.name}</span>
{/if}


<input type="text" bind:value={$watch.name} />
<input type="text" bind:value={$watch.email} />

```

## `updateField`

```ts
const { form, updateField } = createForm({
    schema,
    initialValues,
    onSubmit
})

updateField('name', 'Name')
updateField('email', 'Email')

ou

<input type="text" bind:value={$watch.name} on:input={() => updateField('name', $watch.name)} />
<input type="text" bind:value={$watch.email} on:input={() => updateField('email', $watch.email)} />

```

## `updateFields`

```ts

const { form, updateFields } = createForm({
    schema,
    initialValues,
    onSubmit
})

updateFields({ name: 'Name', email: 'Email' })

ou

<input type="text" bind:value={$watch.name} on:input={e => updateFields({ name: e.target.value })} />
<input type="text" bind:value={$watch.email} on:input={e => updateFields({ email: e.target.value })} />

```

## `getValue`

```ts
const { form, getValue } = createForm({
	schema,
	initialValues,
	onSubmit
});

const name = getValue('name');
const email = getValue('email');
```

## `getValues`

```ts
const { form, getValues } = createForm({
	schema,
	initialValues,
	onSubmit
});

const { name, email } = getValues();
```

## `reset`

```ts
const { form, reset } = createForm({
	schema,
	initialValues,
	onSubmit
});

reset();
```
