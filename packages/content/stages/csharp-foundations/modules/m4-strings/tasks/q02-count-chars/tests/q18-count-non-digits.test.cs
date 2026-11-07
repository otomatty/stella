public class Q18CountNonDigitsTests
{
    [Fact(DisplayName = "Q18 数字以外の個数")]
    public void Q18CountNonDigits()
    {
        Assert.Equal(1, Answers.Q18CountNonDigits("20a6"));
        Assert.Equal(0, Answers.Q18CountNonDigits("2026"));
        Assert.Equal(2, Answers.Q18CountNonDigits("ab"));
        Assert.Equal(0, Answers.Q18CountNonDigits(""));
    }
}
