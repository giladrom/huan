import { AbstractControl } from '@angular/forms';

export function PasswordValidator(
  control: AbstractControl
): { [key: string]: boolean } {
  var password = control.get('password');
  var verify = control.get('passwordVerify');

  if (!password || !verify) {
    return null;
  }

  if (verify.value === password.value) {
    return null;
  } else {
    return { nomatch: true };
  }
}
