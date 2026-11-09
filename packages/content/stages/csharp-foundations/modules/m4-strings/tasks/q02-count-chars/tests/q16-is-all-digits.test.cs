public class Q16IsAllDigitsTests
{
    [Fact(DisplayName = "Q16 全部数字か")]
    public void Q16IsAllDigits()
    {
        Assert.Equal(true, Answers.Q16IsAllDigits("123"));
        Assert.Equal(false, Answers.Q16IsAllDigits("12a"));
        Assert.Equal(false, Answers.Q16IsAllDigits(""));
        Assert.Equal(true, Answers.Q16IsAllDigits("0"));
    }
}
