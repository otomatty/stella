public class Q27CountDigitsTests
{
    [Fact(DisplayName = "Q27 数字の個数")]
    public void Q27CountDigits()
    {
        Assert.Equal(3, Answers.Q27CountDigits("20a6"));
        Assert.Equal(0, Answers.Q27CountDigits(""));
    }
}
