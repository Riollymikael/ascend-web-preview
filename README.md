# Ascend Web — prévia

Versão de revisão do site Ascend Web, separada do site de produção.

## Publicação da prévia

No repositório `Riollymikael/ascend-web-preview`, selecione **Settings → Pages → Source → GitHub Actions**. O workflow publica a branch `main` no GitHub Pages.

Endereço esperado após uma publicação bem-sucedida: https://riollymikael.github.io/ascend-web-preview/

## Preparar os arquivos

Execute `node scripts/build-preview.mjs`. A pasta `dist/` contém somente os arquivos públicos utilizados pelo site, sem ferramentas de auditoria ou imagens de versões antigas.

Esta prévia não configura nem substitui o domínio do site atual.
