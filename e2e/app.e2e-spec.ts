import { GRKConstrutoraTemplatePage } from './app.po';

describe('GRKConstrutora App', function () {
    let page: GRKConstrutoraTemplatePage;

    beforeEach(() => {
        page = new GRKConstrutoraTemplatePage();
    });

    it('should display message saying app works', () => {
        page.navigateTo();
        expect(page.getParagraphText()).toEqual('app works!');
    });
});
