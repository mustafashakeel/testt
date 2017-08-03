import { Component } from '@angular/core';

import { HomePage } from '../home/home';
import { Briefcase } from '../briefcase/briefcase';
import { SelectQuote } from '../quote/select-quote';
import { SelectOpportunity } from '../opportunity/select-opportunity';
import { MorePage } from '../more/more';

@Component({
  templateUrl: 'tabs.html'
})
export class TabsPage {

  tab1Root = HomePage;
  tab2Root = Briefcase;
  tab3Root = SelectOpportunity;
  tab4Root = SelectQuote;
  tab5Root = MorePage;

  constructor() {

  }
}
