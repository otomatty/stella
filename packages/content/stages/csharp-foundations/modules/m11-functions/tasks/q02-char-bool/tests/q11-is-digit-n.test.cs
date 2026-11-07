public class Q11IsDigitNTests
{
    [Fact(DisplayName = "Q11 N桁の数字か")]
    public void Q11IsDigitN()
    {
        Assert.Equal(true, Answers.Q11IsDigitN("12345", 5));
        Assert.Equal(false, Answers.Q11IsDigitN("12345", 13));
        Assert.Equal(true, Answers.Q11IsDigitN("1234567890123", 13));
        Assert.Equal(false, Answers.Q11IsDigitN("", 13));
        Assert.Equal(false, Answers.Q11IsDigitN("1234567a", 8));
    }
}
