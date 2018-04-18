import { FormControl } from '@angular/forms';

export class NameValidator {
  static validName(fc: FormControl){
    if(fc.value.toLowerCase() === "abc123" || fc.value.toLowerCase() === "123abc"){
      return ({validName: true});
    } else {
      return (null);
    }
  }
}