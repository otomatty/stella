public class Q20IsNonEmptyDigitsTests
{
    [Fact(DisplayName = "Q20 空でない数字か")]
    public void Q20IsNonEmptyDigits()
    {
        Assert.Equal(true, Answers.Q20IsNonEmptyDigits("0"));
        Assert.Equal(false, Answers.Q20IsNonEmptyDigits(""));
        Assert.Equal(false, Answers.Q20IsNonEmptyDigits("0a"));
    }
}
