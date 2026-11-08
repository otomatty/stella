public class Q11CountDigitsTests
{
    [Fact(DisplayName = "Q11 半角数字の個数")]
    public void Q11CountDigits()
    {
        Assert.Equal(4, Answers.Q11CountDigits("2026"));
        Assert.Equal(3, Answers.Q11CountDigits("20a6"));
        Assert.Equal(0, Answers.Q11CountDigits("abc"));
        Assert.Equal(0, Answers.Q11CountDigits(""));
    }
}
