import { Component } from '@angular/core';
import { NavParams } from "ionic-angular";

@Component({
    selector: "description-popover",
    templateUrl: 'description-popover.html'
})
export class DescriptionPopover {

    public description: string;

    constructor(private params: NavParams) {
        this.description = params.get("description");
        console.log(this.description);
    }

}
