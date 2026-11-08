public class Q12IsEightDigitsTests
{
    [Fact(DisplayName = "Q12 8桁の数字か")]
    public void Q12IsEightDigits()
    {
        Assert.Equal(true, Answers.Q12IsEightDigits("20260903"));
        Assert.Equal(false, Answers.Q12IsEightDigits("1234567a"));
        Assert.Equal(false, Answers.Q12IsEightDigits(""));
    }
}
