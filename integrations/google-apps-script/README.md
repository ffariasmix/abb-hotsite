# Receber o feedback do Hotsite no seu Google (Drive + Planilha + e-mail)

Este guia liga o formulário do Hotsite a um **Google Apps Script** que roda na
sua própria conta Google. A cada envio, ele:

- salva os **anexos** numa pasta do seu **Drive** (`ABB Feedback - Anexos`);
- registra uma linha numa **Planilha Google** (aba `Feedback`);
- envia um **e-mail** para a equipe.

Sem servidor, sem custo, sem serviço de terceiros. Leva ~5 minutos.

## Passo a passo

1. **Crie uma Planilha Google** nova (planilha em branco). Ela vai guardar as respostas.
2. Na planilha, abra o menu **Extensões → Apps Script**.
3. Apague o código de exemplo e **cole todo o conteúdo de `Codigo.gs`** (deste diretório).
4. *(Opcional)* No topo do script, ajuste `EMAILS` para quem deve receber os avisos.
5. Clique em **Salvar** (ícone do disquete).
6. Clique em **Implantar → Nova implantação**.
   - Em "Selecionar tipo" (engrenagem), escolha **App da Web**.
   - **Executar como:** `Eu (seu e-mail)`.
   - **Quem pode acessar:** `Qualquer pessoa`.
   - Clique em **Implantar**.
7. O Google vai pedir **autorização** (por rodar em seu nome). Aceite. Se aparecer
   "app não verificado", clique em *Avançado → Acessar (nome do projeto)* — é o seu
   próprio script.
8. Copie a **URL do app da Web** (termina em `/exec`).
9. Abra **`site/app.js`** e cole essa URL na constante `APPS_SCRIPT_URL`:
   ```js
   const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfy..../exec';
   ```
10. Publique o site (o workflow do GitHub Pages faz isso ao dar `push`).

## Testar

- Abra a URL do app no navegador: deve mostrar **"ABB Feedback endpoint ativo."**
- No site publicado, preencha o formulário e envie. Confira:
  - nova linha na aba **Feedback** da planilha;
  - **e-mail** recebido;
  - anexos na pasta **ABB Feedback - Anexos** do Drive.

## Se precisar mudar o código depois

Edite o `Codigo.gs` no editor do Apps Script e faça **Implantar → Gerenciar
implantações → (editar) → Nova versão**. A URL `/exec` continua a mesma.

## Observações

- Limite de anexo: **10 MB por arquivo** (validado no site).
- Se um dia quiser desligar a coleta, é só apagar a implantação — o site volta
  ao modo `mailto` automaticamente se você limpar `APPS_SCRIPT_URL`.
