/** Page de définition / réinitialisation de mot de passe (atterrissage des liens `recovery`). */
export const SET_PASSWORD_PATH = '/definir-mot-de-passe';

export function setPasswordRedirectUrl(): string {
  return `${window.location.origin}${SET_PASSWORD_PATH}`;
}
