// public/js/register.js

const formReg   = document.getElementById('form-register');
const erroEl    = document.getElementById('reg-erro');
const sucessoEl = document.getElementById('reg-sucesso');

formReg.addEventListener('submit', async (e) => {
  e.preventDefault();
  erroEl.classList.add('hidden');
  sucessoEl.classList.add('hidden');

  const nome      = document.getElementById('nome').value;
  const email     = document.getElementById('email').value;
  const senha     = document.getElementById('senha').value;
  const matricula = document.getElementById('matricula').value;
  const papel     = document.getElementById('papel').value;

  const btn = document.getElementById('btn-register');
  btn.disabled = true;
  btn.textContent = 'Cadastrando...';

  try {
    const data = await Auth.register(nome, email, senha, papel, matricula);
    salvarSessao(data);

    sucessoEl.textContent = 'Conta criada com sucesso! Redirecionando...';
    sucessoEl.classList.remove('hidden');

    setTimeout(() => {
      window.location.href = data.usuario.papel === 'professor'
        ? '/professor.html'
        : '/aluno.html';
    }, 1200);
  } catch (err) {
    erroEl.textContent = err.message;
    erroEl.classList.remove('hidden');
    btn.disabled = false;
    btn.textContent = 'Cadastrar';
  }
});
