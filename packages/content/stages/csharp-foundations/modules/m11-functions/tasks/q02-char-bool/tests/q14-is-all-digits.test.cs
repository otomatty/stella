public class Q14IsAllDigitsTests
{
    [Fact(DisplayName = "Q14 全部数字か")]
    public void Q14IsAllDigits()
    {
        Assert.Equal(true, Answers.Q14IsAllDigits("123"));
        Assert.Equal(false, Answers.Q14IsAllDigits("12a"));
        Assert.Equal(false, Answers.Q14IsAllDigits(""));
    }
}
