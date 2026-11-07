public class Q19CountLeadingDigitsTests
{
    [Fact(DisplayName = "Q19 先頭の数字")]
    public void Q19CountLeadingDigits()
    {
        Assert.Equal(2, Answers.Q19CountLeadingDigits("20a6"));
        Assert.Equal(0, Answers.Q19CountLeadingDigits("a12"));
        Assert.Equal(4, Answers.Q19CountLeadingDigits("2026"));
        Assert.Equal(0, Answers.Q19CountLeadingDigits(""));
    }
}
